import React from "react";
import GenderPicker from "./GenderPicker";

const LeaderboardsFilters = ({ genderFilter, setGenderFilter }: any) => {
  return (
    <div
      style={{
        display: "flex",
        padding: "16px",
      }}
    >
      <GenderPicker gender={genderFilter} onChange={setGenderFilter} />
    </div>
  );
};

export default LeaderboardsFilters;
