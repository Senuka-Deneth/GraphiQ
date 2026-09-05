diagram class FormatPreserve

// attached to Order
class Order {
  -id: UUID

  +calculateTotal(): Float
}

interface Payable {
  +pay(amount: Money): Boolean
}

abstract class Document

Order --|> Document
