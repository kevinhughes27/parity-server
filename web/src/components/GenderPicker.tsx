import React from "react";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import { map } from "lodash";

const GENDERS = ["all", "female", "male"];

function GenderPicker(props: {
  gender: string;
  onChange: (gender: string) => void;
}) {
  const { gender } = props;

  const onChange = (event: SelectChangeEvent) => {
    props.onChange(event.target.value);
  };

  const genderText = (gender: string) => {
    switch (gender) {
      case "male":
        return "Male";
      case "female":
        return "Female";
      default:
        return "All";
    }
  };

  const genderOptions = map(GENDERS, (gender) => {
    return (
      <MenuItem key={gender} value={gender}>
        {genderText(gender)}
      </MenuItem>
    );
  });

  return (
    <FormControl size="small">
      <InputLabel id="gender-picker-label">Gender</InputLabel>
      <Select
        labelId="gender-picker-label"
        id="gender-picker"
        value={gender}
        label="Gender"
        onChange={onChange}
      >
        {genderOptions}
      </Select>
    </FormControl>
  );
}

export default GenderPicker;
