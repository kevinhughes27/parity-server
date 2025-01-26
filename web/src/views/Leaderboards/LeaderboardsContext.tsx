import { createContext, PropsWithChildren, useState } from "react";

export const LeaderboardsContext = createContext({
  genderFilter: "all",
  subFilter: "show",
  setGenderFilter: (_gender: string) => {},
  setSubFilter: (_filter: string) => {},
});

export function LeaderboardsContextProvider({
  children,
}: PropsWithChildren<{}>) {
  const [subFilter, setSubFilter] = useState("show");
  const [genderFilter, setGenderFilter] = useState("all");

  return (
    <LeaderboardsContext.Provider
      value={{ subFilter, setSubFilter, genderFilter, setGenderFilter }}
    >
      {children}
    </LeaderboardsContext.Provider>
  );
}
