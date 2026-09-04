diagram package System

package billing {
  class Invoice
}

package catalog {
  class Product
}

billing ..> catalog : «import»
