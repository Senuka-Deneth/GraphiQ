diagram activity HospitalAppointmentManagement

partition Patient {
  action Login
  action SearchDoctorBySpecialty
  action SelectDoctor
  action RequestAppointment
  action SelectAnotherDoctor
  action CancelBookingRequest
  action MakePayment
  action RetryPayment
  action CancelAppointment
}

partition AppointmentSystem {
  action VerifyMedicalRecord
  action CreateMedicalRecord
  action CheckDoctorAvailability
  action AssignAppointmentSlot
  action RequestPayment
  action ProcessPayment
  action ConfirmBooking
  action UpdateDoctorSchedule
  action RecordAppointmentInMedicalHistory
}

partition BillingDepartment {
  action GeneratePaymentReceipt
}

partition NotificationService {
  action SendAppointmentConfirmation
}

initial --> Login
Login --> SearchDoctorBySpecialty
SearchDoctorBySpecialty --> SelectDoctor
SelectDoctor --> RequestAppointment
RequestAppointment --> VerifyMedicalRecord

decision MedicalRecordValid
VerifyMedicalRecord --> MedicalRecordValid

MedicalRecordValid --> CheckDoctorAvailability : [Valid]
MedicalRecordValid --> CreateMedicalRecord : [Invalid]

CreateMedicalRecord --> CheckDoctorAvailability

decision DoctorAvailable
CheckDoctorAvailability --> DoctorAvailable

DoctorAvailable --> AssignAppointmentSlot : [Available]
DoctorAvailable --> decision NoSlotChoice : [NotAvailable]

NoSlotChoice --> SelectAnotherDoctor : [SelectAnotherDoctor]
NoSlotChoice --> CancelBookingRequest : [Cancel]

SelectAnotherDoctor --> CheckDoctorAvailability
CancelBookingRequest --> flow final

AssignAppointmentSlot --> RequestPayment
RequestPayment --> MakePayment
MakePayment --> ProcessPayment

decision PaymentSuccessful
ProcessPayment --> PaymentSuccessful

PaymentSuccessful --> ConfirmBooking : [Successful]
PaymentSuccessful --> decision PaymentFailureChoice : [Unsuccessful]

PaymentFailureChoice --> RetryPayment : [Retry]
PaymentFailureChoice --> CancelAppointment : [Cancel]

RetryPayment --> MakePayment
CancelAppointment --> flow final

ConfirmBooking --> fork BookingFork

BookingFork --> UpdateDoctorSchedule
BookingFork --> RecordAppointmentInMedicalHistory
BookingFork --> GeneratePaymentReceipt
BookingFork --> SendAppointmentConfirmation

join BookingJoin

UpdateDoctorSchedule --> BookingJoin
RecordAppointmentInMedicalHistory --> BookingJoin
GeneratePaymentReceipt --> BookingJoin
SendAppointmentConfirmation --> BookingJoin

BookingJoin --> final
