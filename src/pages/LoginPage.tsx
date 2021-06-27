import { Link, useHistory } from "react-router-dom";
import { Container } from "../components/Container";

export const LoginPage: React.FC = () => {
    const history = useHistory();
    const onSubmit = () => {
        history.replace('/dashboard')
    };


        return (<Container small centered>
            <input type="text" placeholder="Username" />
            <input type="password" placeholder="Password" />
            <input type="submit" value="Login" className="success" onClick={onSubmit} />

            <p><Link to="/forgot">Forgot Password</Link></p>
            <p><Link to="/register">Register a new user</Link></p>
        </Container>);
}