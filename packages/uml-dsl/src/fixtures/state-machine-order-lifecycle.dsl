diagram stateMachine OrderLifecycle

[*] --> Draft
Draft --> Paid : pay [amount > 0] / emitReceipt
Paid --> [*]
