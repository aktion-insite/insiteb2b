import * as React from "react";
import Typography, { TypographyProps } from "@insite/mobius/Typography";
import translate from "@insite/client-framework/Translate";
import WidgetModule from "@insite/client-framework/Types/WidgetModule";
import InjectableCss from "@insite/mobius/utilities/InjectableCss";
import { css } from "styled-components";
import StyledWrapper from "@insite/client-framework/Common/StyledWrapper";
import { OrderDetailsPageContext } from "@insite/content-library/Pages/OrderDetailsPage";
import { useContext } from "react";
import { OrderStateContext } from "@insite/client-framework/Store/Data/Orders/OrdersSelectors";
import LocalizedDateTime from "@insite/content-library/Components/LocalizedDateTime";

export interface OrderDetailsRequestedDateStyles {
    titleText?: TypographyProps;
    description?: TypographyProps;
    wrapper?: InjectableCss;
}

const styles: OrderDetailsRequestedDateStyles = {
    titleText: {
        variant: "h6",
        as: "h2",
        css: css`
            @media print { font-size: 12px; }
            margin-bottom: 5px;
        `,
    },
};

export const requestedDateStyles = styles;

const OrderDetailsRequestedDate: React.FunctionComponent = () => {
    const { value: order } = useContext(OrderStateContext);
    if (!order) {
        return null;
    }

    if (!order.requestedDeliveryDateDisplay) {
        return null;
    }

    return (
        <StyledWrapper {...styles.wrapper}>
            <Typography {...styles.titleText}>{translate("Date Requested")}</Typography>
            <Typography {...styles.description} data-test-selector="orderDetails_requestedDeliveryDate">
                <LocalizedDateTime dateTime={new Date(order.requestedDeliveryDateDisplay)}
                    options={{ year: "numeric", month: "numeric", day: "numeric" }} />
            </Typography>
        </StyledWrapper>
    );
};

const widgetModule: WidgetModule = {
    component: OrderDetailsRequestedDate,
    definition: {
        allowedContexts: [OrderDetailsPageContext],
        group: "Order Details",
        isSystem: true,
    },
};

export default widgetModule;