diagram compositeStructure CarInternals

class Car {
  part engine: Engine
  part wheels: Wheel [4]
  port power: PowerPort
}

connector c1 : engine.power to power
