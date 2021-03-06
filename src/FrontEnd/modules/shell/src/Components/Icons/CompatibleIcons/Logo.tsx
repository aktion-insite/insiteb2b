import * as React from "react";

const Logo: React.FC = () => {
    return (
        <svg focusable="false" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
            <g fill="#4A4A4A" fillRule="evenodd">
                <path d="M12 16.16l-5.561 4.09 2.142-6.594L3 9.9h6.886L12 3l2.114 6.9H21l-5.579 3.756 2.143 6.594z" />
                <path d="M3 15.828L1.146 17.25l.714-2.294L0 13.65h2.295L3 11.25l.705 2.4H6l-1.86 1.306.715 2.294zm18 0l-1.854 1.422.714-2.294L18 13.65h2.295l.705-2.4.705 2.4H24l-1.86 1.306.715 2.294z" />
            </g>
        </svg>
    );
};

export default React.memo(Logo);
