import * as React from "react";
import styled, { css, withTheme, ThemeProps } from "styled-components";
import Button, { ButtonIcon, ButtonPresentationProps, ButtonVariants } from "../Button";
import buttonDisplayProps from "./buttonDisplayProps";
import Select, { SelectComponentProps } from "../Select";
import Typography from "../Typography";
import applyPropBuilder from "../utilities/applyPropBuilder";
import breakpointMediaQueries from "../utilities/breakpointMediaQueries";
import injectCss from "../utilities/injectCss";
import omitSingle from "../utilities/omitSingle";
import VisuallyHidden from "../VisuallyHidden";
import InjectableCss, { StyledProp } from "../utilities/InjectableCss";
import { FormFieldPresentationProps } from "../FormField";
import { BaseTheme } from "../globals/baseTheme";
import MobiusStyledComponentProps from "../utilities/MobiusStyledComponentProps";

export interface PaginationPresentationProps {
    /** CSS string or styled-components function to be injected into this component
     * @themable */
    cssOverrides?: {
        currentButton?: StyledProp<PaginationProps>;
        ellipsis?: StyledProp<PaginationProps>;
        linkList?: StyledProp<PaginationProps>;
        pagination?: StyledProp<PaginationProps>;
        perPageSelect?: StyledProp<PaginationProps>;
    };
    /** An object containing props to be passed down to the button component inside pagination.
     * @themable */
    buttonProps?: ButtonPresentationProps;
    /** The button variant that should be used for the current button.
     * @themable */
    currentPageButtonVariant?: ButtonVariants;
    /** An object containing props to be passed down to the select component inside pagination
     * @themable */
    selectProps?: FormFieldPresentationProps<SelectComponentProps>;
    /** An object containing icon sources for the navigation button icons.
     * @themable */
    navIconsSrc?: {
        firstPage?: React.ComponentType | string,
        previousPage?: React.ComponentType | string,
        nextPage?: React.ComponentType | string,
        lastPage?: React.ComponentType | string,
    }
}

export type PaginationComponentProps = MobiusStyledComponentProps<"div", {
    /** The index of the current page of results being displayed */
    currentPage: number;
    /** String describing the "results per page" select */
    resultsPerPageLabel?: string;
    /** OnChange function passed to the select component governing the number of results per page. Receives the event as an argument. */
    onChangeResultsPerPage: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    /** Function to build href passed to each button in the pagination button/link list. Receives the page index as an argument. */
    createHref?: (page: number) => void;
    /** OnChange function passed to each button in the pagination button/link list. Receives the page index as an argument. */
    onChangePage: (page: number) => void;
    /** Number of results currently being displayed on each page */
    resultsPerPage: number;
    /** Number of total results to be displayed within the pagination component */
    resultsCount: number;
    /** Options to be displayed under the "results per page" select */
    resultsPerPageOptions: number[];
}>;

export type PaginationProps = PaginationPresentationProps & PaginationComponentProps & ThemeProps<BaseTheme>;

const responsiveStyles = css`
    margin: 4px 0;
    width: 100%;
    justify-content: center;
    display: flex;
    align-items: center;
`;

const iconButtonStyles = css`
    ${({ theme }) => (breakpointMediaQueries(theme, [css` width: 24px; `, null, null, css` width: 46px; `, null], "min"))};
    justify-content: center;
`;

const numericButtonStyles = css`
    padding: 0 8px;
`;

const PaginationStyle = styled.div<InjectableCss>`
    ${({ theme }) => (breakpointMediaQueries(theme, [null, null, css` flex-wrap: wrap; `, null, null], "max"))};
    ${({ theme }) => (breakpointMediaQueries(theme, [css` margin: 4px 0; `, null, null, css` margin: 16px 0; `, null], "min"))};
    display: flex;
    justify-content: flex-end;
    align-items: center;
    ${injectCss}
`;

const LinkList = styled.nav<InjectableCss>`
    ${({ theme }) => (breakpointMediaQueries(theme, [null, null, responsiveStyles, null, null], "max"))};
    ul {
        list-style: none;
    }
    li {
        display: inline-block;
    }
    ${injectCss}
`;

const PerPageSelect = styled.span<InjectableCss>`
    ${({ theme }) => (breakpointMediaQueries(theme, [null, null, responsiveStyles, null, null], "max"))};
    ${injectCss}
`;

/**
 * Pagination is an interactive component that provides a navigation interface for paged content.
 */
const Pagination: React.FC<PaginationProps> = withTheme(props => {
    const {
        createHref,
        currentPage,
        onChangeResultsPerPage,
        onChangePage,
        resultsPerPage,
        resultsPerPageLabel,
        resultsCount,
        resultsPerPageOptions,
        ...otherProps
    } = props;

    const { spreadProps, applyProp } = applyPropBuilder(otherProps, { component: "pagination" });
    const cssOverrides = spreadProps("cssOverrides" as any);
    const buttonProps = spreadProps("buttonProps" as any);
    const currentPageButtonVariant = applyProp("currentPageButtonVariant");
    const translate = otherProps.theme.translate;
    const navIconsSrc = spreadProps("navIconsSrc");

    const finalPageIndex = Math.floor((resultsCount - 1) / resultsPerPage) + 1;
    let pagesToDisplay: ("e" | number)[] = [];
    if (finalPageIndex < 6) {
        for (let i = 1; i <= finalPageIndex; i += 1) {
            pagesToDisplay.push(i);
        }
    } else if (currentPage < 4) {
        pagesToDisplay = [1, 2, 3, 4, "e", finalPageIndex];
    } else if (currentPage >= 4 && currentPage < (finalPageIndex - 2)) {
        pagesToDisplay = [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, "e", finalPageIndex];
    } else {
        pagesToDisplay = ["e", finalPageIndex - 4, finalPageIndex - 3, finalPageIndex - 2, finalPageIndex - 1, finalPageIndex];
    }

    const paginationButtons = pagesToDisplay.map((page) => {
        if (page === "e") return (<Typography key={page} css={cssOverrides.ellipsis}>&hellip;</Typography>);
        return (
            <li key={`page${page}`}>
                <Button
                    {...buttonDisplayProps(props, {
                    moreCss: numericButtonStyles, page, cssOverrides, buttonProps, currentPageButtonVariant,
                })}>
                    {page.toString()}
                </Button>
            </li>);
    });

    const forwardDisabled = currentPage === finalPageIndex || finalPageIndex === 1;
    const backDisabled = currentPage === 1 || finalPageIndex === 1;

    const navIcon = (
        pageIndex: number,
        icon: string | React.ComponentType,
        ariaLabel: string,
        disabledFlag: boolean,
        dataTestSelector?: string,
    ) => (
        <Button
            variant="secondary"
            {...buttonDisplayProps(props, { page: -1, moreCss: iconButtonStyles, cssOverrides, buttonProps, currentPageButtonVariant })}
            aria-label={ariaLabel}
            disabled={disabledFlag}
            onClick={() => onChangePage(pageIndex)}
            {...(dataTestSelector && { "data-test-selector": dataTestSelector })}
        >
            <VisuallyHidden>{ariaLabel}</VisuallyHidden>
            <ButtonIcon size={15} src={icon} />
        </Button>
    );

    return (
        <PaginationStyle css={cssOverrides.pagination} {...omitSingle(otherProps, "cssOverrides")}>
            <PerPageSelect css={cssOverrides.perPageSelect}>
                <Select
                    onChange={onChangeResultsPerPage}
                    label={resultsPerPageLabel || translate("Results Per Page")}
                    labelPosition="left"
                    value={resultsPerPage}
                    {...spreadProps("selectProps" as any)}
                    data-test-selector="paginationPerPageSelect"
                >
                    {resultsPerPageOptions.map((n: string) => <option key={n} value={n}>{n}</option>)}
                </Select>
            </PerPageSelect>
            <LinkList role="navigation" aria-label={translate("Pagination navigation")} css={cssOverrides.linkList} data-test-selector={`paginationCurrentPage${currentPage}`}>
                <ul>
                    <li>{navIcon(1, navIconsSrc.firstPage, translate("First page"), backDisabled)}</li>
                    <li>{navIcon(currentPage - 1, navIconsSrc.previousPage, translate("Previous page"), backDisabled)}</li>
                    {paginationButtons}
                    <li>{navIcon(currentPage + 1, navIconsSrc.nextPage, translate("Next page"), forwardDisabled, "paginationButtonNext")}</li>
                    <li>{navIcon(finalPageIndex, navIconsSrc.lastPage, translate("Last page"), forwardDisabled)}</li>
                </ul>
            </LinkList>
        </PaginationStyle>
    );
});

/** @component */
export default Pagination as React.ComponentType<PaginationComponentProps>;

export { Pagination, PaginationStyle };