diagram deployment Prod

node "AppCluster" <<device>> {
  artifact shop.war
}

node "DB" <<device>> {
  artifact shop.db
}

AppCluster -- DB : SQL
