import { Link } from "react-router-dom";
import { Container } from "../components/Container";

const HomePage: React.FC = () => {
    return (
        <Container>
        <h1>Home</h1>
        <Link to="/login" className="btn">Login</Link>
        <Link to="/register" className="btn">Sign up</Link>
        </Container>
    )
}

export default HomePage;