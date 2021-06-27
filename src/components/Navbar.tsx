import { Link } from "react-router-dom";

export const Navbar: React.FC = () => {
        return (<nav>
            <ul>
                <li><Link to="/dashboard">Dashboard</Link></li>
                <li><Link to="/leaderboard">Leaderboard</Link></li>
            </ul>
        </nav>);
}