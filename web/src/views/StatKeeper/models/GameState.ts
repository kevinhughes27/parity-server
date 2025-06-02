// Corresponds to GameState.java
export enum GameState {
  Normal = 1,
  FirstD = 2, // After a throwaway/drop, defense player selected (is firstActor)
  Start = 3, // Start of game or point, before puller selected
  Pull = 4, // Puller selected, ready to record pull
  WhoPickedUpDisc = 5, // After pull or turnover (throwaway/drop/D where D-player is not firstActor), waiting to know who has disc
  FirstThrowQuebecVariant = 6, // After disc picked up from pull, or after non-turnover D by firstActor
  SecondD = 7, // After a D by firstActor, or drop by firstActor, and firstActor is still selected (e.g. caught D)
}
