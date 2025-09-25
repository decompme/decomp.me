import DateObject from "react-date-object";
import ReactTimeAgo from "react-timeago";

function formatDateString(x: string, format = "YYYY-MM-DD HH:mm:ss") {
    const date = Date.parse(x);
    const dateObject = new DateObject(date);
    return dateObject.format(format);
}

export default function TimeAgo({
    date,
}: {
    date: string;
}) {
    const title = formatDateString(date);

    return <ReactTimeAgo date={date} title={title} />;
}
