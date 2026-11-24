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

#[cfg(test)]
mod tests {
    use super::Scheduler;
    use shared::CognitiveEvent;
    use uuid::Uuid;

    fn event(event_type: &str) -> CognitiveEvent {
        CognitiveEvent::new(
            Uuid::nil(),
            "scheduler-test",
            event_type,
            serde_json::json!({}),
        )
    }

    #[test]
    fn enqueue_rejects_over_capacity_and_returns_the_event() {
        let mut scheduler = Scheduler::new(1);
        scheduler.enqueue(event("first")).expect("first event fits");

        let rejected = scheduler
            .enqueue(event("second"))
            .expect_err("queue is full");

        assert_eq!(rejected.event_type, "second");
        assert_eq!(scheduler.len(), 1);
    }

    #[test]
    fn dequeue_preserves_fifo_order() {
        let mut scheduler = Scheduler::new(2);
        scheduler.enqueue(event("first")).expect("first event fits");
        scheduler
            .enqueue(event("second"))
            .expect("second event fits");

        assert_eq!(
            scheduler.dequeue().map(|event| event.event_type),
            Some("first".into())
        );
        assert_eq!(
            scheduler.dequeue().map(|event| event.event_type),
            Some("second".into())
        );
        assert!(scheduler.is_empty());
    }
}
