import React, { useEffect, useState } from "react";
import { Link, RouteComponentProps } from "react-router-dom";
import { Card } from "../components/Card";
import { Container } from "../components/Container";
import { API_URL } from "../constants";
import { Func, Project } from "../types";

interface Params {
    project: string
}

interface Funcs {
    easy: Func[],
    moderate: Func[],
    hard: Func[],
}

export const ProjectPage: React.FC<RouteComponentProps<Params>> = ({ match }) => {

    const [project, setProject] = useState<Project | undefined>(undefined)
    const [functions, setFunctions] = useState<Funcs>({easy:[], moderate:[], hard:[]})

    const loadProject = async (project: string) => {
        const res = await fetch(API_URL + 'projects/' + project)
        const data = await res.json()
        setProject(data)
    }
    const loadFunctions = async (project: string) => {
        const res = await fetch(API_URL + 'functions?projectId=' + project)
        const data = await res.json() as Func[]

        const funcs: Funcs = {
            easy: [],
            moderate: [],
            hard: []
        }

        for (const func of data) {
            console.log((func.score ?? 0) < 40)
            if ((func.score ?? 0) < 40) {
                funcs.easy.push(func)
            } else if((func.score ?? 0) < 80) {
                funcs.moderate.push(func)
            } else {
                funcs.hard.push(func)
            }
        }

        setFunctions(funcs)
    };

    useEffect(() => {
        loadProject(match.params.project)
        loadFunctions(match.params.project)
    }, [match.params.project])

    return (
        <Container>
            <h1>{project?.name}</h1>
            <div className="columns">
                <div className="column overflowY">
                    <h2>Easy</h2>
                    {functions.easy.map((func) => (
                        <Link key={func.id} to={"/projects/" + match.params.project + "/functions/" + func.id}>
                        <Card>
                            {func.name}
                        </Card>
                        </Link>
                    ))}
                    
                </div>
                <div className="column">
                    <h2>Moderate</h2>
                    {functions.moderate.map((func) => (
                        <Link key={func.id} to={"/projects/" + match.params.project + "/functions/" + func.id}>
                        <Card>
                            {func.name}
                        </Card>
                        </Link>
                    ))}
                </div>
                <div className="column rightmost">
                    <h2>Hard</h2>
                    {functions.hard.map((func) => (
                        <Link key={func.id} to={"/projects/" + match.params.project + "/functions/" + func.id}>
                        <Card>
                            {func.name}
                        </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </Container>
    );
}