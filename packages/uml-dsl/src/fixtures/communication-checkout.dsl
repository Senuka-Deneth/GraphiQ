diagram communication CheckoutComm

instance customer: Customer
instance shop: Shop

customer -> shop : 1: placeOrder()
shop -> customer : 2: confirm()
