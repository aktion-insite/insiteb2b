import Button, { ButtonIcon } from "@insite/mobius/Button";
import ChevronDown from "@insite/mobius/Icons/ChevronDown";
import ChevronUp from "@insite/mobius/Icons/ChevronUp";
import PublishModal from "@insite/shell/Components/Shell/PublishModal";
import {
    setPublishButtonExpanded,
    showPublishModal,
} from "@insite/shell/Store/PublishModal/PublishModalActionCreators";
import ShellState from "@insite/shell/Store/ShellState";
import React from "react";
import { connect, ResolveThunks } from "react-redux";
import styled from "styled-components";

const mapStateToProps = ({ publishModal }: ShellState) => ({
    visible: publishModal.publishButtonExpanded,
});

const mapDispatchToProps = {
    setPublishButtonExpanded,
    showPublishModal,
};

interface OwnProps {}

type Props = ReturnType<typeof mapStateToProps> & ResolveThunks<typeof mapDispatchToProps> & OwnProps;

class PublishDropDown extends React.Component<Props> {
    element = React.createRef<HTMLDivElement>();

    toggle = () => {
        this.props.setPublishButtonExpanded(!this.props.visible);
    };

    mouseDown = (event: MouseEvent) => {
        const { current } = this.element;
        if (!current) {
            return;
        }

        if (this.props.visible && !current.contains(event.target as Node)) {
            this.props.setPublishButtonExpanded(false);
        }
    };

    componentDidMount() {
        document.addEventListener("mousedown", this.mouseDown);
    }

    componentWillUnmount() {
        document.removeEventListener("mousedown", this.mouseDown);
    }

    onPublish = () => {
        this.props.showPublishModal();
    };

    onBulkPublish = () => {
        this.props.showPublishModal(true);
    };

    render() {
        const { visible } = this.props;
        return (
            <>
                <PublishButton
                    data-test-selector="headerBar_publish"
                    onClick={this.onPublish}
                    expanded={visible}
                    variant="primary"
                >
                    Publish
                </PublishButton>
                <PublishModal />
                <div ref={this.element}>
                    <PublishDropDownButton
                        data-test-selector="headerBar_expandPublishOptions"
                        expanded={visible}
                        style={{ width: "100%" }}
                        onClick={this.toggle}
                    >
                        <ButtonIcon src={visible ? ChevronUp : ChevronDown} size={14} />
                    </PublishDropDownButton>
                    {!visible ? null : (
                        <InlinePopUpOuterWrapper>
                            <InlinePopUpInnerWrapper>
                                <div data-test-selector="headerBar_publishLine" onClick={this.onPublish}>
                                    Publish
                                </div>
                                <div data-test-selector="headerBar_bulkPublishLine" onClick={this.onBulkPublish}>
                                    Bulk Publish
                                </div>
                            </InlinePopUpInnerWrapper>
                        </InlinePopUpOuterWrapper>
                    )}
                </div>
            </>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(PublishDropDown);

const InlinePopUpOuterWrapper = styled.div`
    z-index: ${props => props.theme.zIndex.dynamicDropdown};
    position: relative;
`;

const InlinePopUpInnerWrapper = styled.div`
    position: absolute;
    background: #fff;
    box-shadow: ${props => props.theme.shadows[1]};
    border-radius: 0 0 4px 4px;
    width: 100px;
    right: 0;
    padding: 3px 10px;
    font-size: 14px;
    div {
        cursor: pointer;
        &:hover {
            opacity: 0.7;
        }
    }
`;

type HasExpanded = { expanded?: boolean };

const PublishButton = styled(Button)<HasExpanded>`
    background: ${({ theme }) => theme.colors.common.background};
    color: ${({ theme }) => theme.colors.primary.main};
    height: 100%;
    padding: 6px 10px;

    &:hover {
        background-color: #1456f140;
    }
`;

const PublishDropDownButton = styled(Button)<HasExpanded>`
    background: ${({ theme }) => theme.colors.common.background};
    border: 0;
    border-radius: ${props => (props.expanded ? "0 4px 0 0" : "0 4px 4px 0")};
    height: 27px;
    margin: 1px 0 1px 0;
    padding: 0 1px;
    span {
        svg {
            color: ${({ theme }) => theme.colors.text.accent};
        }
    }
    &:hover {
        background: ${({ theme }) => theme.colors.common.background};
    }
`;
