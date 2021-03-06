/* eslint-disable spire/export-styles */
import mergeToNew from "@insite/client-framework/Common/mergeToNew";
import StyledWrapper from "@insite/client-framework/Common/StyledWrapper";
import { HasProductContext, withProductContext } from "@insite/client-framework/Components/ProductContext";
import { makeHandlerChainAwaitable } from "@insite/client-framework/HandlerCreator";
import { FulfillmentMethod } from "@insite/client-framework/Services/SessionService";
import siteMessage from "@insite/client-framework/SiteMessage";
import ApplicationState from "@insite/client-framework/Store/ApplicationState";
import { getSettingsCollection } from "@insite/client-framework/Store/Context/ContextSelectors";
import { hasEnoughInventory } from "@insite/client-framework/Store/Data/Products/ProductsSelectors";
import addToCart from "@insite/client-framework/Store/Pages/Cart/Handlers/AddToCart";
import { canAddToCart } from "@insite/client-framework/Store/Pages/ProductDetails/ProductDetailsSelectors";
import translate from "@insite/client-framework/Translate";
import { CartLineModel } from "@insite/client-framework/Types/ApiModels";
import ProductAddedToCartMessage from "@insite/content-library/Components/ProductAddedToCartMessage";
import Button, { ButtonPresentationProps } from "@insite/mobius/Button";
import ToasterContext from "@insite/mobius/Toast/ToasterContext";
import * as React from "react";
import { connect, ResolveThunks } from "react-redux";

interface OwnProps {
    labelOverride?: string;
    extendedStyles?: ButtonPresentationProps;
}

type Props = OwnProps &
    ReturnType<typeof mapStateToProps> &
    ResolveThunks<typeof mapDispatchToProps> &
    HasProductContext;

const mapStateToProps = (state: ApplicationState, props: HasProductContext) => {
    return {
        productSettings: getSettingsCollection(state).productSettings,
        canAddToCart: canAddToCart(state, props.productContext.product, props.productContext.productInfo),
        hasEnoughInventory: hasEnoughInventory(state, props.productContext),
        addingProductToCart: state.context.addingProductToCart,
    };
};

const mapDispatchToProps = {
    addToCart: makeHandlerChainAwaitable(addToCart),
};

export const productAddToCartButtonStyles: ButtonPresentationProps = {};

const ProductAddToCartButton: React.FC<Props> = ({
    productContext: {
        product,
        productInfo: { qtyOrdered, unitOfMeasure, inventory },
    },
    productSettings,
    hasEnoughInventory,
    addingProductToCart,
    addToCart,
    canAddToCart,
    labelOverride,
    extendedStyles,
    ...otherProps
}) => {
    const toasterContext = React.useContext(ToasterContext);
    const [styles] = React.useState(() => mergeToNew(productAddToCartButtonStyles, extendedStyles));

    if (!productSettings.canAddToCart || !hasEnoughInventory || !canAddToCart) {
        return null;
    }

    const addToCartClickHandler = async () => {
        const cartline = (await addToCart({
            productId: product.id.toString(),
            qtyOrdered,
            unitOfMeasure,
        })) as CartLineModel;

        if (productSettings.showAddToCartConfirmationDialog) {
            toasterContext.addToast({
                body: <ProductAddedToCartMessage isQtyAdjusted={cartline.isQtyAdjusted} multipleProducts={false} />,
                messageType: "success",
            });
        }
    };

    return (
        <Button
            {...styles}
            onClick={addToCartClickHandler}
            disabled={qtyOrdered <= 0 || addingProductToCart}
            {...otherProps}
        >
            {labelOverride ?? translate("Add to Cart")}
        </Button>
    );
};
export default withProductContext(connect(mapStateToProps, mapDispatchToProps)(ProductAddToCartButton));
