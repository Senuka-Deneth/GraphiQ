diagram sequence Checkout

lifeline customer: Actor
lifeline shop: Shop
lifeline pay: Payments

customer -> shop : placeOrder()
shop -> pay : charge()
pay -->> shop : ok
shop -->> customer : confirmation
