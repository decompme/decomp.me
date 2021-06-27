import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/Card";
import { Container } from "../components/Container";
import { API_URL } from "../constants";
import { Project } from "../types";

export const DashboardPage: React.FC = () => {

    const [projects, setProjects] = useState<Project[]>([])

    const fetchProjects = async () => {
        const res = await fetch(API_URL + 'projects')
        const data = await res.json()

        setProjects(data)
    }

    useEffect(() => {
        fetchProjects()
    }, [])


    return (<Container>
        <h1>Dashboard</h1>
        <div className="columns">
            <div className="column">
                <h2>Projects</h2>
                {
                    projects.map((project) => (
                        <Link key={project.id} to={"/projects/"+project.id}>
                        <Card>
                            {project.name}
                        </Card>
                    </Link>
                    ))
                }
            </div>
            <div className="column rightmost">
                <h2>Bookmarked Functions</h2>
            </div>

        </div>


    </Container>);
}