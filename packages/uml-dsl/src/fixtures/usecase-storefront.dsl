diagram useCase Storefront

actor Customer
actor Clerk

subject Shop {
  usecase Checkout
  usecase Pay
  usecase Refund
}

Customer -- Checkout
Checkout ..> Pay : «include»
Refund ..> Checkout : «extend»
Clerk -- Refund
