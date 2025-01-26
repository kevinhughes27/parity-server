import React from "react";
import GenderPicker from "./GenderPicker";

const LeaderboardsFilters = ({ genderFilter, setGenderFilter }: any) => {
  return <GenderPicker gender={genderFilter} onChange={setGenderFilter} />;
};

export default LeaderboardsFilters;
