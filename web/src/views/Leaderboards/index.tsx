import React, { useMemo, useState } from "react";
import Card from "./Card";
import { Stats } from "../../api";
import LeaderboardsFilters from "../../components/LeaderboardsFilters";

export default function Leaderboards(props: { stats: Stats }) {
  const stats = props.stats;

  const [subFilter, setSubFilter] = useState("show");
  const [genderFilter, setGenderFilter] = useState("all");

  const filteredStats = useMemo(() => {
    const showAllData = subFilter === "show" && genderFilter === "all";

    return showAllData
      ? stats
      : Object.fromEntries(
          Object.entries(stats).filter(([key, value]) => {
            const satisfiesSubFilter =
              subFilter === "show" || !key.endsWith("(S)");
            const satisfiesGenderFilter =
              genderFilter === "all" || value.gender === genderFilter;

            return satisfiesSubFilter && satisfiesGenderFilter;
          })
        );
  }, [genderFilter, stats, subFilter]);

  return (
    <div>
      <LeaderboardsFilters
        genderFilter={genderFilter}
        setGenderFilter={setGenderFilter}
        subsFilter={subFilter}
        setSubsFilter={setSubFilter}
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
