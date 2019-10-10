import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import { withTheme } from './styles'

const ThemedApp = withTheme(App);

ReactDOM.render(<ThemedApp />, document.getElementById('root'))
