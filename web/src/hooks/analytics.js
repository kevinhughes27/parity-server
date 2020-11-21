import React from "react"
import ReactGA from "react-ga"
import { useLocation } from "react-router-dom"

export default function useGoogleAnalytics() {
  const location = useLocation();

  React.useEffect(() => {
    ReactGA.initialize('UA-87669001-1');
  }, [])

  React.useEffect(() => {
    if (location.hostname !== 'localhost') {
      ReactGA.set({ page: location.pathname })
      ReactGA.pageview(location.pathname)
    }
  }, [location])
}
