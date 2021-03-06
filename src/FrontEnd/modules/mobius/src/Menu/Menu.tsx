import Clickable, { ClickablePresentationProps, ClickableProps } from "@insite/mobius/Clickable";
import { BaseTheme } from "@insite/mobius/globals/baseTheme";
import { IconMemo, IconPresentationProps } from "@insite/mobius/Icon";
import Typography, { TypographyPresentationProps } from "@insite/mobius/Typography";
import applyPropBuilder from "@insite/mobius/utilities/applyPropBuilder";
import focusWithinImportInBrowser from "@insite/mobius/utilities/focusWithin";
import getColor from "@insite/mobius/utilities/getColor";
import getProp from "@insite/mobius/utilities/getProp";
import InjectableCss, { StyledProp } from "@insite/mobius/utilities/InjectableCss";
import injectCss from "@insite/mobius/utilities/injectCss";
import MobiusStyledComponentProps from "@insite/mobius/utilities/MobiusStyledComponentProps";
import uniqueId from "@insite/mobius/utilities/uniqueId";
import React from "react";
import styled, { ThemeConsumer, ThemeProps, withTheme } from "styled-components";

focusWithinImportInBrowser();

export interface MappedLink {
    // expanded from content-library/src/widgets/header/MainNavigation.tsx
    title: string;
    url?: string;
    clickableProps?: ClickableProps;
    openInNewWindow?: boolean;
    numberOfColumns?: number;
    maxDepth?: number;
    childrenType?: "MegaMenu" | "CascadingMenu";
    children?: MappedLink[];
    excludeFromNavigation?: boolean;
}

export interface MenuPresentationProps {
    /** CSS string or styled-components function to be injected into this component
     * @themable */
    cssOverrides?: {
        wrapper?: StyledProp<MenuPresentationProps>;
        menu?: StyledProp<MenuPresentationProps>;
        menuItem?: StyledProp<MenuPresentationProps>;
    };
    /** Props passed to the menu items.
     * @themable */
    menuItemTypographyProps?: TypographyPresentationProps;
    /** Props passed to the menu item Clickable.
     * @themable */
    menuItemClickableProps?: ClickablePresentationProps;
    /** Props to be passed to the right chevron arrow for menu items with children.
     * @themable */
    moreIconProps?: IconPresentationProps;
}

type MenuComponentProps = MobiusStyledComponentProps<
    "nav",
    {
        /** Aria attributes used internally require an `id`. If not provided, a random id is generated. */
        descriptionId?: string;
        /** Maximum number of menus that will appear through submenu cascading. */
        maxDepth?: number;
        /** The nested child structure that will be rendered by the menu. */
        menuItems: MappedLink[];
        /** The element that triggers the menu. */
        menuTrigger: React.ReactElement;
        /** Width of the menu and submenus in pixels. */
        width?: number;
        /** Allows forcing the state of this menu to be open */
        isOpen?: true;
    }
>;

/** MenuComponentProps with defaulted properties now listed as not-optional, plus theme. */
export type MenuProps = MenuComponentProps & MenuPresentationProps & ThemeProps<BaseTheme>;

// eslint-disable-next-line no-unexpected-multiline
const MenuStyle = styled.ul<
    ThemeProps<BaseTheme> &
        InjectableCss & {
            width?: number;
        }
>`
    background: ${getColor("common.background")};
    z-index: ${getProp("theme.zIndex.menu")};
    box-shadow: ${getProp("theme.shadows.2")};
    width: ${getProp("width", 175)}px;
    list-style: none;
    position: absolute;
    margin: 0;
    padding: 0;
    display: none;
    ${injectCss}
`;

const MenuWrapper = styled.nav<{ canBeOpen: boolean; isOpen?: true } & InjectableCss>`
    position: relative; /* stylelint-disable */
        ${({ isOpen }) =>
            isOpen &&
            `& > ${MenuStyle} {
                display: block;
            }
    `}
    ${({ canBeOpen }) =>
        canBeOpen &&
        `
    &:focus-within > ${MenuStyle}  /* stylelint-enable */ {
        display: block;
    }
    .trigger:focus + ${MenuStyle},
    &:hover > ${MenuStyle},
    &.focus-within > ${MenuStyle} {
        display: block;
    }`}
    ${injectCss}
`;

// eslint-disable-next-line no-unexpected-multiline
const MenuItemStyle = styled.li<
    ThemeProps<BaseTheme> &
        InjectableCss & {
            width?: number;
        }
>`
    position: relative;
    &:focus-within > ${MenuStyle} {
        display: block;
        left: ${getProp("width", 175)}px;
        top: 0;
    }
    &:focus > ${MenuStyle}, &:hover > ${MenuStyle}, &.focus-within > ${MenuStyle} {
        display: block;
        left: ${getProp("width", 175)}px;
        top: 0;
    }
    a {
        width: 100%;
        min-height: 42px;
        justify-content: space-between;
        &:hover {
            background: ${getColor("common.border")};
        }
    }
    ${injectCss}
`;

const MenuItemText = styled(Typography as any)<{ hasChildren?: boolean }>`
    padding: 10px 15px 10px 20px;
    color: ${getColor("text.main")};
    display: block;
    box-sizing: border-box;
    ${({ hasChildren }: { hasChildren?: boolean }) => hasChildren && "width: calc(100% - 24px);"}
`;

const trigger = React.createRef<HTMLElement>();

interface MenuState {
    canBeOpen: boolean;
}

/**
 * A cascading menu that renders a defined number of sub-menus.
 */
class Menu extends React.Component<MenuProps, MenuState> {
    static defaultProps: Partial<MenuProps> = {
        maxDepth: 3,
        width: 175,
    };

    state: MenuState = {
        canBeOpen: true,
    };

    closeMenu = () => {
        this.setState({ canBeOpen: false }, () =>
            setTimeout(() => {
                // The make the all browsers act the same on item click.
                if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                }
                this.setState({ canBeOpen: true });
            }, 100),
        );
    };

    render() {
        return (
            <ThemeConsumer>
                {theme => {
                    const { menuItems, menuTrigger, isOpen, ...otherProps } = this.props;
                    const { applyProp, spreadProps } = applyPropBuilder(
                        { ...otherProps, theme },
                        { component: "menu" },
                    );

                    const renderMenuItems = (childMenuItems: MappedLink[], currentDepth: number) => {
                        const cssOverrides = spreadProps("cssOverrides");
                        const maxDepth = otherProps.maxDepth || 3;
                        return (
                            <MenuStyle width={otherProps.width} css={cssOverrides?.menu}>
                                {childMenuItems
                                    ?.filter(item => !item.excludeFromNavigation)
                                    .map(item => {
                                        const hasChildren = item.children?.length && currentDepth < maxDepth;
                                        return (
                                            <MenuItemStyle
                                                width={otherProps.width}
                                                css={cssOverrides?.menuItem}
                                                key={item.title}
                                            >
                                                <Clickable
                                                    href={item.url}
                                                    onClick={this.closeMenu}
                                                    {...applyProp("menuItemClickableProps")}
                                                >
                                                    <MenuItemText
                                                        hasChildren={hasChildren}
                                                        {...applyProp("menuItemTypographyProps")}
                                                    >
                                                        {item.title}
                                                    </MenuItemText>
                                                    {item.children?.length && currentDepth < maxDepth ? (
                                                        <IconMemo {...applyProp("moreIconProps")} />
                                                    ) : null}
                                                </Clickable>
                                                {hasChildren
                                                    ? renderMenuItems(item!.children!, currentDepth + 1)
                                                    : null}
                                            </MenuItemStyle>
                                        );
                                    })}
                            </MenuStyle>
                        );
                    };

                    const cssOverrides = spreadProps("cssOverrides");
                    const descriptionId = otherProps.descriptionId || uniqueId();
                    return (
                        <>
                            <MenuWrapper
                                canBeOpen={this.state.canBeOpen}
                                isOpen={isOpen}
                                css={cssOverrides?.wrapper}
                                {...{ "aria-labelledby": descriptionId }}
                                {...otherProps}
                            >
                                {React.cloneElement(menuTrigger, { id: descriptionId, className: "trigger" })}
                                {renderMenuItems(menuItems, 1)}
                            </MenuWrapper>
                            <span ref={trigger} tabIndex={-1} />
                        </>
                    );
                }}
            </ThemeConsumer>
        );
    }
}

/** @component */
export default withTheme(Menu);

export { MenuItemText };
