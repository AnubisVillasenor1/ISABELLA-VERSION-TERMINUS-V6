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

#[cfg(test)]
mod tests {
    use super::Scheduler;
    use shared::CognitiveEvent;
    use serde_json::json;
    use uuid::Uuid;

    fn event() -> CognitiveEvent {
        CognitiveEvent::new(Uuid::now_v7(), "scheduler-test", "test.event", json!({}))
    }

    #[test]
    fn queue_enforces_capacity_and_preserves_rejected_event() {
        let mut scheduler = Scheduler::new(1);
        let first = event();
        let rejected = event();
        let rejected_id = rejected.event_id;

        assert!(scheduler.enqueue(first).is_ok());
        let error = scheduler.enqueue(rejected);
        assert!(error.is_err());

        let returned = match error {
            Err(returned) => returned,
            Ok(()) => panic!("full scheduler must return the rejected event"),
        };
        assert_eq!(returned.event_id, rejected_id);
        assert_eq!(scheduler.len(), 1);
        assert!(!scheduler.is_empty());
    }

    #[test]
    fn zero_capacity_is_normalized_to_one() {
        let mut scheduler = Scheduler::new(0);
        assert!(scheduler.enqueue(event()).is_ok());
        assert!(scheduler.enqueue(event()).is_err());
    }

    #[test]
    fn dequeue_returns_events_in_fifo_order() {
        let mut scheduler = Scheduler::new(2);
        let first = event();
        let second = event();
        let first_id = first.event_id;
        let second_id = second.event_id;

        assert!(scheduler.enqueue(first).is_ok());
        assert!(scheduler.enqueue(second).is_ok());

        let dequeued_first = match scheduler.dequeue() {
            Some(value) => value,
            None => panic!("first queued event should be present"),
        };
        let dequeued_second = match scheduler.dequeue() {
            Some(value) => value,
            None => panic!("second queued event should be present"),
        };

        assert_eq!(dequeued_first.event_id, first_id);
        assert_eq!(dequeued_second.event_id, second_id);
        assert!(scheduler.is_empty());
        assert!(scheduler.dequeue().is_none());
    }
}
