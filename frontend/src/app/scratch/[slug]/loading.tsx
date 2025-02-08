import Nav from "@/components/Nav";
import { TextSkeleton, CODE, DIFF } from "@/components/TextSkeleton";

export default function LoadingSkeleton() {
    return (
        <div className="relative flex size-full animate-pulse flex-col overflow-hidden">
            <Nav>
                <div className="ml-1 flex w-full items-center gap-1.5">
                    <div className="size-5 rounded-full bg-gray-6" />
                    <div className="h-5 w-16 bg-gray-6" />
                    <div className="h-5 w-48 bg-gray-6" />
                </div>
            </Nav>
            <div className="flex grow border-gray-6 border-t">
                <div className="w-1/2 gap-1 overflow-hidden border-gray-6 border-r p-8">
                    <TextSkeleton text={CODE} />
                </div>
                <div className="w-1/2 gap-1 overflow-hidden border-gray-6 border-r p-8">
                    <TextSkeleton text={DIFF} />
                </div>
            </div>

            <noscript>
                <div
                    role="status"
                    className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 font-medium"
                >
                    JavaScript is required to edit scratches
                </div>
            </noscript>
            <span role="status" className="sr-only">
                Loading editor...
            </span>
        </div>
    );
}
