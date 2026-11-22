use shared::CognitiveEvent;
use std::collections::VecDeque;

#[derive(Debug, Default)]
pub struct Scheduler {
    queue: VecDeque<CognitiveEvent>,
    capacity: usize,
}

impl Scheduler {
    pub fn new(capacity: usize) -> Self {
        Self {
            queue: VecDeque::new(),
            capacity: capacity.max(1),
        }
    }

    /// Enqueue an event, returning it boxed when the queue is full.
    ///
    /// Boxing the rejected event keeps the error variant small while preserving
    /// ownership so callers can retry, inspect, or persist the event.
    pub fn enqueue(&mut self, event: CognitiveEvent) -> Result<(), Box<CognitiveEvent>> {
        if self.queue.len() >= self.capacity {
            return Err(Box::new(event));
        }
        self.queue.push_back(event);
        Ok(())
    }

    pub fn dequeue(&mut self) -> Option<CognitiveEvent> {
        self.queue.pop_front()
    }

    pub fn len(&self) -> usize {
        self.queue.len()
    }

    pub fn is_empty(&self) -> bool {
        self.queue.is_empty()
    }
}
