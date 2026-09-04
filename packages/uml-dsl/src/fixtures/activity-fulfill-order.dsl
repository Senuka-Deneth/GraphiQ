diagram activity FulfillOrder

partition Sales {
  action ReceiveOrder
}

partition Warehouse {
  action Pack
  action Ship
}

initial --> ReceiveOrder
ReceiveOrder --> Pack
Pack --> Ship
Ship --> final
