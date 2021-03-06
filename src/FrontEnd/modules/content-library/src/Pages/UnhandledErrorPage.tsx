import Zone from "@insite/client-framework/Components/Zone";
import PageModule from "@insite/client-framework/Types/PageModule";
import PageProps from "@insite/client-framework/Types/PageProps";
import Page from "@insite/mobius/Page";
import * as React from "react";

const UnhandledErrorPage: React.FC<PageProps> = ({ id }) => (
    <Page>
        <Zone contentId={id} zoneName="Content" />
    </Page>
);

const pageModule: PageModule = {
    component: UnhandledErrorPage,
    definition: {
        hasEditableTitle: true,
        hasEditableUrlSegment: true,
        pageType: "System",
    },
};

export default pageModule;
