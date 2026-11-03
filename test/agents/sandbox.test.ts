import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  SandboxViolation,
  listSandboxFiles,
  normalizeSandboxRelativePath,
  readSandboxFile,
  resolveSandboxPath,
  writeSandboxFile,
} from "../../src/agents/sandbox";

const tempRoots: string[] = [];

async function sandboxRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "isabella-sandbox-"));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  while (tempRoots.length) {
    const root = tempRoots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

function violationCode(error: unknown): string {
  expect(error).toBeInstanceOf(SandboxViolation);
  return (error as SandboxViolation).code;
}

describe("CERO sandbox — path containment", () => {
  it("normalizes a relative path and strips redundant segments", () => {
    expect(normalizeSandboxRelativePath("patches/./task.diff")).toBe("patches/task.diff");
    expect(normalizeSandboxRelativePath("patches\\task.diff")).toBe("patches/task.diff");
  });

  it("rejects traversal, absolute paths, drive letters, NUL and empty paths", async () => {
    const root = await sandboxRoot();
    const cases: Array<[string, string]> = [
      ["../escape.txt", "PATH_TRAVERSAL"],
      ["patches/../../escape.txt", "PATH_TRAVERSAL"],
      ["/etc/passwd", "ABSOLUTE_PATH"],
      ["C:\\Windows\\win.ini", "ABSOLUTE_PATH"],
      ["bad\0name", "NUL_BYTE"],
      ["   ", "EMPTY_PATH"],
      ["", "EMPTY_PATH"],
    ];
    for (const [input, code] of cases) {
      try {
        resolveSandboxPath(root, input);
        throw new Error(`expected SandboxViolation for ${JSON.stringify(input)}`);
      } catch (error) {
        expect(violationCode(error)).toBe(code);
      }
    }
  });

  it("does not confuse a sibling directory with a root prefix", async () => {
    const parent = await sandboxRoot();
    const root = join(parent, "sandbox");
    await mkdir(root, { recursive: true });
    await mkdir(join(parent, "sandbox-evil"), { recursive: true });

    try {
      resolveSandboxPath(root, "../sandbox-evil/secret.txt");
      throw new Error("expected SandboxViolation");
    } catch (error) {
      expect(violationCode(error)).toBe("PATH_TRAVERSAL");
    }
  });
});

describe("CERO sandbox — bounded writes and reads", () => {
  it("writes and reads a file with a SHA3-512 digest", async () => {
    const root = await sandboxRoot();
    const written = await writeSandboxFile(root, "patches/task.diff", "diff --git a b\n");
    expect(written.relative).toBe("patches/task.diff");
    expect(written.created).toBe(true);
    expect(written.bytes).toBe(15);
    expect(written.sha3_512).toBe(
      createHash("sha3-512").update("diff --git a b\n").digest("hex"),
    );

    const read = await readSandboxFile(root, "patches/task.diff");
    expect(read.content).toBe("diff --git a b\n");
    expect(read.sha3_512).toBe(written.sha3_512);

    const again = await writeSandboxFile(root, "patches/task.diff", "updated\n");
    expect(again.created).toBe(false);
  });

  it("refuses to write above the byte limit and leaves no file behind", async () => {
    const root = await sandboxRoot();
    try {
      await writeSandboxFile(root, "big.txt", "x".repeat(64), { maxBytes: 32 });
      throw new Error("expected SandboxViolation");
    } catch (error) {
      expect(violationCode(error)).toBe("FILE_TOO_LARGE");
    }
    await expect(readSandboxFile(root, "big.txt")).rejects.toThrow(/ENOENT/);
  });

  it("refuses to read a directory as a file", async () => {
    const root = await sandboxRoot();
    await mkdir(join(root, "folder"), { recursive: true });
    await expect(readSandboxFile(root, "folder")).rejects.toThrow(/NOT_A_FILE/);
  });

  it("lists files deterministically without following symlinks", async () => {
    const root = await sandboxRoot();
    await writeSandboxFile(root, "b.txt", "b");
    await writeSandboxFile(root, "nested/a.txt", "a");
    await writeSandboxFile(root, "nested/deep/c.txt", "c");
    expect(await listSandboxFiles(root)).toEqual(["b.txt", "nested/a.txt", "nested/deep/c.txt"]);
    expect(await listSandboxFiles(root, { maxEntries: 2 })).toHaveLength(2);
  });

  it("refuses to traverse a symlink that points outside the sandbox", async () => {
    const parent = await sandboxRoot();
    const root = join(parent, "sandbox");
    const outside = join(parent, "outside");
    await mkdir(root, { recursive: true });
    await mkdir(outside, { recursive: true });
    await writeFile(join(outside, "secret.txt"), "no debe leerse", "utf8");

    try {
      await symlink(outside, join(root, "link"), "dir");
    } catch {
      // Windows sin privilegios de symlink: no hay nada que verificar.
      return;
    }

    try {
      await readSandboxFile(root, "link/secret.txt");
      throw new Error("expected SandboxViolation");
    } catch (error) {
      expect(violationCode(error)).toBe("SYMLINK_ESCAPE");
    }
  });
});
