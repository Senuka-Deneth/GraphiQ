diagram component Storefront

component CustomerWebApp {
  requires ProductCatalogue
  requires OrderManagement
}
component OrderManagement {
  provides OrderManagement
  requires PaymentService
  requires InventoryManagement
  requires NotificationService
}
component PaymentService {
  provides PaymentService
  requires BankPaymentGateway
}
component ProductCatalogue {
  provides ProductCatalogue
}
component InventoryManagement {
  provides InventoryManagement
}
component NotificationService {
  provides NotificationService
}
component BankPaymentGateway {
  provides BankPaymentGateway
}
CustomerWebApp required ProductCatalogue -- provided ProductCatalogue ProductCatalogue
CustomerWebApp required OrderManagement -- provided OrderManagement OrderManagement
OrderManagement required PaymentService -- provided PaymentService PaymentService
OrderManagement required InventoryManagement -- provided InventoryManagement InventoryManagement
OrderManagement required NotificationService -- provided NotificationService NotificationService
PaymentService required BankPaymentGateway -- provided BankPaymentGateway BankPaymentGateway
