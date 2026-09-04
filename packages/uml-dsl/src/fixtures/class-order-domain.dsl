diagram class OrderDomain

class Order {
  -id: UUID
  +calculateTotal(): Float
}

interface Payable {
  +pay(amount: Money): Boolean
}

abstract class Document

enum OrderStatus {
  Draft
  Paid
}

Order "1" --> "*" LineItem : contains
Order *-- LineItem
Order --|> Document
Order ..|> Payable
Order ..> Mailer : uses
