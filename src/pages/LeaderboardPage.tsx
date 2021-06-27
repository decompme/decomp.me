import { useEffect, useState } from "react";
import { Container } from "../components/Container";
import { API_URL } from "../constants";
import { User } from "../types";

export const LeaderboardPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([])

    const loadUsers = async () => {
        const res = await fetch(API_URL + 'users')
        const data = await res.json() as User[]
        data.sort((a, b) => b.points - a.points)
        setUsers(data)
    }

    useEffect(() => {
        loadUsers()
    }, [])

    return (
        <Container>
            <h1>Leaderboard</h1>
            <table>
                <tr>
                    <th>Username</th><th>Points</th>
                </tr>
                {
                    users.map((user) => (
                        <tr>
                            <td>{user.name}</td>
                            <td>{user.points}</td>
                        </tr>
                    ))
                }
            </table>
        </Container>
    );
}