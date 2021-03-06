import {
    createHandlerChainRunner,
    Handler,
    HasOnSuccess,
    makeHandlerChainAwaitable,
} from "@insite/client-framework/HandlerCreator";
import validateAddress, { AddressErrors } from "@insite/client-framework/Store/CommonHandlers/ValidateAddress";
import {
    AddressFieldDisplayCollectionModel,
    BillToModel,
    CustomerValidationDto,
} from "@insite/client-framework/Types/ApiModels";

type HandlerType = Handler<
    {
        address: BillToModel;
        validation: CustomerValidationDto;
        fieldDisplay: AddressFieldDisplayCollectionModel;
    } & HasOnSuccess<boolean>,
    {
        formErrors: AddressErrors;
    }
>;

export const ValidateAddress: HandlerType = async props => {
    const awaitableValidate = makeHandlerChainAwaitable<Parameters<typeof validateAddress>[0], AddressErrors>(
        validateAddress,
    );
    props.formErrors = await awaitableValidate({
        address: props.parameter.address,
        validationRules: props.parameter.validation!,
        addressFieldDisplayCollection: props.parameter.fieldDisplay,
    })(props.dispatch, props.getState);
};

export const SetFormErrors: HandlerType = props => {
    props.dispatch({
        type: "Pages/CheckoutShipping/SetBillingAddressFormErrors",
        formErrors: props.formErrors,
    });
};

export const ExecuteOnSuccessCallback: HandlerType = props => {
    props.parameter.onSuccess?.(Object.keys(props.formErrors).length === 0);
};

export const chain = [ValidateAddress, SetFormErrors, ExecuteOnSuccessCallback];

const validateBillingAddressForm = createHandlerChainRunner(chain, "ValidateBillingAddressForm");
export default validateBillingAddressForm;
