import React, { useState } from "react";
import Card from "./Card";
import { Stats } from "../../api";
import LeaderboardsFilters from "../../components/LeaderboardsFilters";

export default function Leaderboards(props: { stats: Stats }) {
  const stats = props.stats;

  const [genderFilter, setGenderFilter] = useState("all");
  const filteredStats =
    genderFilter === "all"
      ? stats
      : Object.fromEntries(
          Object.entries(stats).filter(
            ([_key, value]) => value.gender === genderFilter
          )
        );

  return (
    <div>
      <LeaderboardsFilters
        genderFilter={genderFilter}
        setGenderFilter={setGenderFilter}
      />

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <Card stat="pay" stats={filteredStats} money={true} />
        <Card stat="salary_per_point" stats={filteredStats} money={true} />
        <Card stat="goals" stats={filteredStats} />
        <Card stat="assists" stats={filteredStats} />
        <Card stat="second_assists" stats={filteredStats} />
        <Card stat="callahan" stats={filteredStats} />
        <Card stat="catches" stats={filteredStats} />
        <Card stat="completions" stats={filteredStats} />
        <Card stat="d_blocks" stats={filteredStats} />
        <Card stat="throw_aways" stats={filteredStats} />
      </div>
    </div>
  );
}
