import React from 'react';
import {BrowserRouter as Router, Route, Switch} from 'react-router-dom';
import './App.css'
import EditorPage from './pages/EditorPage';
import HomePage from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProjectPage } from './pages/ProjectPage';
import { Navbar } from './components/Navbar';
import { LeaderboardPage } from './pages/LeaderboardPage';

const App: React.FC = () => {
    return (

      <Router><div 
      className="App" style={{
        display: "flex",
        flexDirection: "column"
      }}>
        <Navbar />

      <Switch>
      <Route path="/" exact component={HomePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/projects/:project/functions/:function" component={EditorPage} />
      <Route path="/projects/:project" component={ProjectPage} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route component={NotFoundPage} />
      </Switch>
      </div>
      </Router>
    );
 
}

export default App;