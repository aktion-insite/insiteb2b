import React, { FC } from "react";
import translate from "@insite/client-framework/Translate";
import Checkbox, { CheckboxPresentationProps } from "@insite/mobius/Checkbox";
import { HasProductContext, withProduct } from "@insite/client-framework/Components/ProductContext";
import ProductImage, { ProductImageStyles } from "@insite/content-library/Components/ProductImage";
import { connect } from "react-redux";
import ApplicationState from "@insite/client-framework/Store/ApplicationState";
import StyledWrapper from "@insite/client-framework/Common/StyledWrapper";
import InjectableCss from "@insite/mobius/utilities/InjectableCss";
import { css } from "styled-components";
import { getSettingsCollection } from "@insite/client-framework/Store/Context/ContextSelectors";

interface OwnProps extends HasProductContext {
    showImage: boolean;
    showCompare: boolean;
}

const mapStateToProps = (state: ApplicationState) => ({
    settingsCollection: getSettingsCollection(state),
});

type Props = ReturnType<typeof mapStateToProps> & OwnProps;

export interface ProductListProductImageStyles {
    wrapper?: InjectableCss;
    productImage?: ProductImageStyles;
    compareCheckbox?: CheckboxPresentationProps;
}

const styles: ProductListProductImageStyles = {
    wrapper: {
        css: css`
            display: flex;
            flex-direction: column;
            width: 100%;
        `,
    },
    compareCheckbox: {
        css: css`
            align-self: center;
            padding-top: 20px;
        ` },
    productImage: {
        image: {
            width: "100%",
            css: css`
                img { min-width: 100%; }
            `,
        },
    },
};

export const productImageStyles = styles;

const ProductListProductImage: FC<Props> = ({ product, showImage, showCompare, settingsCollection }) => {
    return <StyledWrapper {...styles.wrapper}>
        {showImage
            && <ProductImage extendedStyles={styles.productImage} product={product}/>
        }
        {showCompare && settingsCollection.productSettings.enableProductComparisons
            && <Checkbox {...styles.compareCheckbox}>{translate("Compare")}</Checkbox>
        }
    </StyledWrapper>;
};

export default connect(mapStateToProps)(withProduct(ProductListProductImage));