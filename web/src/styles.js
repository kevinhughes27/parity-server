import * as React from 'react';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import lightBlue from '@material-ui/core/colors/lightBlue';
import CssBaseline from '@material-ui/core/CssBaseline';

// A theme with custom primary and secondary color.
const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#ee6e73',
    },
    secondary: lightBlue,
  }
});

function withTheme(Component) {
  function WithTheme(props) {
    // MuiThemeProvider makes the theme available down the React tree
    // thanks to React context.
    return (
      <MuiThemeProvider theme={theme}>
        {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
        <CssBaseline />
        <Component {...props} />
      </MuiThemeProvider>
    );
  }

  return WithTheme;
}

const TopNav = {
  bar: {
    height: 64
  },
  title: {
    flex: 1,
    color: 'white'
  },
  menuButton: {
    color: 'white',
    marginLeft: -12,
    marginRight: 20
  }
};

export {
  withTheme,
  TopNav
}
