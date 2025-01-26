import React from "react";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import { map } from "lodash";

const FILTER_OPTIONS = ["hide", "show"];

function SubFilter(props: {
  filter: string;
  onChange: (filter: string) => void;
}) {
  const { filter } = props;
  console.log("🚀 ~ filter:", filter);

  const onChange = (event: SelectChangeEvent) => {
    props.onChange(event.target.value);
  };

  const filterOptionText = (filter: string) => {
    switch (filter) {
      case "show":
        return "Show";
      case "hide":
        return "Hide";
    }
  };

  const subOptions = map(FILTER_OPTIONS, (filterOption) => {
    return (
      <MenuItem key={filterOption} value={filterOption}>
        {filterOptionText(filterOption)}
      </MenuItem>
    );
  });

  return (
    <FormControl size="small">
      <InputLabel id="sub-filter-label">Subs</InputLabel>
      <Select
        labelId="sub-filter-label"
        id="sub-filter"
        value={filter}
        label="Subs"
        onChange={onChange}
      >
        {subOptions}
      </Select>
    </FormControl>
  );
}

export default SubFilter;
