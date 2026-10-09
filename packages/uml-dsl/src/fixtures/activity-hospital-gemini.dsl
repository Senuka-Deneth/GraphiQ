diagram activity HospitalAppointmentManagement

partition Patient {
  initial init
  action Login
  action SearchDoctor
  action SelectDoctor
  action RequestAppointment
  action SelectAnotherDoctor
  action CancelBookingRequest
  action RetryPayment
  action CancelAppointment
  action ReceiveConfirmation
  flow final patientFlowFinal
}

partition System {
  action VerifyMedicalRecord
  decision CheckNewPatient
  action CreateMedicalRecord
  action CheckDoctorAvailability
  decision CheckAvailability
  action AssignAppointmentSlot
  action RequestPayment
  decision CheckPaymentStatus
  action ConfirmBooking
  action UpdateDoctorSchedule
  action RecordAppointmentInHistory
  fork postPaymentFork
  join postPaymentJoin
  final endProcess
}

partition BillingDepartment {
  action GeneratePaymentReceipt
}

partition NotificationService {
  action SendAppointmentConfirmation
}

init --> Login
Login --> SearchDoctor
SearchDoctor --> SelectDoctor
SelectDoctor --> RequestAppointment
RequestAppointment --> VerifyMedicalRecord

VerifyMedicalRecord --> CheckNewPatient
CheckNewPatient --> CreateMedicalRecord : [New Patient]
CreateMedicalRecord --> CheckDoctorAvailability
CheckNewPatient --> CheckDoctorAvailability : [Existing Patient]

CheckDoctorAvailability --> CheckAvailability
CheckAvailability --> AssignAppointmentSlot : [Available]
CheckAvailability --> SelectAnotherDoctor : [No Slots Available]

SelectAnotherDoctor --> SelectDoctor
SelectAnotherDoctor --> CancelBookingRequest
CancelBookingRequest --> patientFlowFinal

AssignAppointmentSlot --> RequestPayment
RequestPayment --> CheckPaymentStatus

CheckPaymentStatus --> ConfirmBooking : [Success]
CheckPaymentStatus --> RetryPayment : [Failed]
CheckPaymentStatus --> CancelAppointment : [Failed]

RetryPayment --> RequestPayment
CancelAppointment --> patientFlowFinal

ConfirmBooking --> postPaymentFork
postPaymentFork --> UpdateDoctorSchedule
postPaymentFork --> RecordAppointmentInHistory
postPaymentFork --> GeneratePaymentReceipt
postPaymentFork --> SendAppointmentConfirmation

SendAppointmentConfirmation --> ReceiveConfirmation

UpdateDoctorSchedule --> postPaymentJoin
RecordAppointmentInHistory --> postPaymentJoin
GeneratePaymentReceipt --> postPaymentJoin
ReceiveConfirmation --> postPaymentJoin

postPaymentJoin --> endProcess
