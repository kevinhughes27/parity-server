import React, { useContext } from "react";
import GenderFilter from "./GenderFilter";
import SubFilter from "./SubFilter";
import { LeaderboardsContext } from "../views/Leaderboards/LeaderboardsContext";

const LeaderboardsFilters = () => {
  const { subFilter, genderFilter, setSubFilter, setGenderFilter } =
    useContext(LeaderboardsContext);

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        padding: "16px",
      }}
    >
      <GenderFilter gender={genderFilter} onChange={setGenderFilter} />
      <SubFilter filter={subFilter} onChange={setSubFilter} />
    </div>
  );
};

export default LeaderboardsFilters;
