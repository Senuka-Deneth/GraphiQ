diagram object CheckoutSnapshot

instance a: Order {
  id = "o-1"
  status = Paid
}

instance b: LineItem

a -- b : contains
