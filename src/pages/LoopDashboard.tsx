import { useEffect, useState } from "react";
import DashboardRoute from "./DashboardRoute";
import Dashboard from "./ReportQcKPI";

const LoopDashBoard = () => {
    const [statePage, setStatePage] = useState<boolean>(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setStatePage(!statePage);
        }, 15 * 60 * 1000);
        return () => clearTimeout(timer);
    }, [statePage]);

    return (
        <>
            {statePage == true ? <DashboardRoute /> : <Dashboard />}
        </>
    );
}

export default LoopDashBoard;