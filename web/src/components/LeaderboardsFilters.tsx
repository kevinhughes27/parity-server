import React from "react";
import GenderFilter from "./GenderFilter";
import SubFilter from "./SubFilter";

const LeaderboardsFilters = ({
  genderFilter,
  setGenderFilter,
  subFilter,
  setSubFilter,
}: any) => {
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
