import { createTheme, adaptV4Theme } from '@mui/material/styles';

const theme = createTheme(adaptV4Theme({
  palette: {
    primary: {
      main: '#ee6e73',
    },
    secondary: {
      main: '#26a69a'
    }
  }
}));

export default theme
