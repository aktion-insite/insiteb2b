import { contentModeCookieName, isSiteInShellCookieName } from "@insite/client-framework/Common/ContentMode";
import { encodeCookie } from "@insite/client-framework/Common/Cookies";
import { Dictionary, SafeDictionary } from "@insite/client-framework/Common/Types";
import { getHeadTrackingScript, getNoscriptTrackingScript } from "@insite/client-framework/Common/Utilities/tracking";
import { ShellContext } from "@insite/client-framework/Components/IsInShell";
import SessionLoader from "@insite/client-framework/Components/SessionLoader";
import SpireRouter, { convertToLocation } from "@insite/client-framework/Components/SpireRouter";
import logger from "@insite/client-framework/Logger";
import {
    getPageMetadata,
    getRedirectTo,
    getStatusCode,
    getTrackedPromises,
    serverSiteMessageResolver,
    serverTranslationResolver,
    setDomain,
    setHeaders,
    setInitialPage,
    setPromiseAddedCallback,
    setServerSiteMessages,
    setServerTranslations,
    setSessionCookies,
    setUrl,
} from "@insite/client-framework/ServerSideRendering";
import { rawRequest } from "@insite/client-framework/Services/ApiService";
import { getPageUrlByType, getTheme, RetrievePageResult } from "@insite/client-framework/Services/ContentService";
import { getSiteMessages, getTranslationDictionaries } from "@insite/client-framework/Services/WebsiteService";
import { processSiteMessages, setResolver } from "@insite/client-framework/SiteMessage";
import ApplicationState from "@insite/client-framework/Store/ApplicationState";
import { configureStore as publicConfigureStore } from "@insite/client-framework/Store/ConfigureStore";
import { theme as defaultTheme } from "@insite/client-framework/Theme";
import { postStyleGuideTheme, preStyleGuideTheme } from "@insite/client-framework/ThemeConfiguration";
import translate, { processTranslationDictionaries, setTranslationResolver } from "@insite/client-framework/Translate";
import ThemeProvider from "@insite/mobius/ThemeProvider";
import diagnostics from "@insite/server-framework/diagnostics";
import getTemplate, { getTemplatePaths } from "@insite/server-framework/getTemplate";
import healthCheck from "@insite/server-framework/healthCheck";
import { getRelayEndpoints, relayRequest } from "@insite/server-framework/Relay";
import robots from "@insite/server-framework/Robots";
import { generateSiteIfNeeded } from "@insite/server-framework/SiteGeneration";
import { generateTranslations } from "@insite/server-framework/TranslationGeneration";
import { configureStore as shellConfigureStore } from "@insite/shell/Store/ConfigureStore";
import { Request, Response } from "express";
import { createMemoryHistory } from "history";
import merge from "lodash/merge";
import * as React from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { Provider } from "react-redux";
import setCookie from "set-cookie-parser";
import { ServerStyleSheet } from "styled-components";

setResolver(serverSiteMessageResolver);
setTranslationResolver(serverTranslationResolver);

let checkedForSiteGeneration = false;
let triedToGenerateTranslations = false;

const classicToSpirePageMapping: Dictionary<string> = {
    MyListDetailPage: "MyListsDetailsPage",
};

const redirectTo = async ({ originalUrl, path }: Request, response: Response) => {
    let pageType = path.substr("/RedirectTo/".length);
    if (classicToSpirePageMapping[pageType]) {
        pageType = classicToSpirePageMapping[pageType];
    }
    const destination = (await getPageUrlByType(pageType)) || "/";
    response.redirect(destination + originalUrl.substring(path.length));
};

const routes: { path: string | RegExp; handler: any }[] = [];

function addRoute(path: RegExp | string, handler: any) {
    routes.push({
        path: typeof path === "string" ? path.toLowerCase() : path,
        handler,
    });
}

addRoute("/.spire/health", healthCheck);
addRoute("/.spire/diagnostics", diagnostics);
addRoute("/robots.txt", robots);
addRoute("/.spire/content/getTemplatePaths", getTemplatePaths);
addRoute("/.spire/content/getTemplate", getTemplate);
addRoute(/^\/sitemap.*\.xml/i, relayRequest);
for (const endpoint of getRelayEndpoints()) {
    addRoute(new RegExp(`^/${endpoint}(\\/|$)`, "i"), relayRequest);
}
addRoute(/^\/redirectTo\//i, redirectTo);

export default function server(request: Request, response: Response, domain: Parameters<typeof setDomain>[0]) {
    setupSSR(request, domain);

    const loweredPath = request.path.toLowerCase();

    for (const route of routes) {
        if (
            (typeof route.path === "string" && route.path === loweredPath) ||
            (typeof route.path !== "string" && loweredPath.match(route.path))
        ) {
            return route.handler(request, response);
        }
    }

    return pageRenderer(request, response);
}

function setupSSR(request: Request, domain: Parameters<typeof setDomain>[0]) {
    setDomain(domain);

    const { headers } = request;
    const ip =
        (headers["x-forwarded-for"] || "").toString().split(",").pop()?.trim() ||
        request.connection.remoteAddress ||
        request.socket.remoteAddress;
    headers["x-forwarded-for"] = ip;
    setHeaders(headers);
    setUrl(`${request.protocol}://${request.get("host")}${request.originalUrl}`);
}

async function pageRenderer(request: Request, response: Response) {
    if (
        !checkedForSiteGeneration ||
        !IS_PRODUCTION ||
        request.url.toLowerCase().indexOf("generateIfNeeded=true".toLowerCase()) >= 0
    ) {
        try {
            await generateSiteIfNeeded();
        } catch (e) {
            if (IS_PRODUCTION) {
                logger.error(`Site generation failed: ${e}`);
            } else {
                throw e;
            }
        }
        checkedForSiteGeneration = true;
    }

    if (!triedToGenerateTranslations || !IS_PRODUCTION) {
        try {
            await generateTranslations();
        } catch (e) {
            logger.error(`Translation generation failed: ${e}`);
        }
        triedToGenerateTranslations = true;
    }

    // Prepare an instance of the application and perform an initial render that will cause any async tasks (e.g., data access) to begin.
    let store: ReturnType<typeof shellConfigureStore> | ReturnType<typeof publicConfigureStore>;

    const isShellRequest = request.path.toLowerCase().startsWith("/contentadmin");
    const isSiteInShell =
        !isShellRequest &&
        ((request.headers.referer && request.headers.referer.toLowerCase().indexOf("/contentadmin") > 0) ||
            (request.cookies && request.cookies[isSiteInShellCookieName] === "true"));

    let isEditing = false;

    if (isSiteInShell) {
        if (!request.cookies[contentModeCookieName]) {
            response.cookie(contentModeCookieName, "Viewing");
        } else {
            isEditing = request.cookies[contentModeCookieName] === "Editing";
        }

        response.cookie(isSiteInShellCookieName, "true");
    }

    const languageCode = request.cookies.SetContextLanguageCode;

    // Not awaiting right away so it can run concurrently with other API calls.
    const getSiteMessagesPromise =
        !isShellRequest &&
        getSiteMessages({
            languageCode: languageCode ? `${languageCode},null` : undefined,
        });

    const getTranslationDictionariesPromise = getTranslationDictionaries({
        languageCode: languageCode ? `${languageCode}` : undefined,
        pageSize: 131072, // 2 ** 17
    });

    let responseCookies;
    if (isShellRequest) {
        const memoryHistory = createMemoryHistory({
            initialEntries: [request.originalUrl],
        });

        store = shellConfigureStore(memoryHistory);
    } else {
        responseCookies = await loadPageAndSetInitialCookies(request, response);

        store = publicConfigureStore();
    }

    const routerContext: { url?: string } = {};

    let sheet: ServerStyleSheet | undefined;
    let rawHtml = "";

    let theme = defaultTheme;
    if (!isShellRequest) {
        try {
            const apiTheme = await getTheme();
            theme = merge({}, theme, preStyleGuideTheme, apiTheme, postStyleGuideTheme);
        } catch (e) {
            // Ignore errors, just go with the default theme.
        }
    }

    // in the case of a first page load with no request cookies, we get the default language code from the first response
    const responseLanguageCode =
        responseCookies && responseCookies.find(o => o.name === "SetContextLanguageCode")?.value;
    const siteMessages =
        getSiteMessagesPromise &&
        processSiteMessages((await getSiteMessagesPromise).siteMessages, languageCode ?? responseLanguageCode);

    if (siteMessages) {
        setServerSiteMessages(siteMessages);
    }

    const translationDictionaries =
        getTranslationDictionariesPromise &&
        processTranslationDictionaries(
            (await getTranslationDictionariesPromise).translationDictionaries,
            languageCode ?? responseLanguageCode,
        );

    if (translationDictionaries) {
        setServerTranslations(translationDictionaries);
    }

    const renderStorefrontServerSide =
        Object.keys(request.query).filter(param => param.toLowerCase() === "disablessr").length === 0 &&
        !isShellRequest;
    if (renderStorefrontServerSide) {
        const renderRawAndStyles = () => {
            sheet = new ServerStyleSheet();

            const value = { isEditing, isCurrentPage: true, isInShell: isSiteInShell };

            // Changes here must be mirrored to the storefront ClientApp.tsx so the render output matches.
            const rawStorefront = (
                <Provider store={store}>
                    <ShellContext.Provider value={value}>
                        <ThemeProvider
                            theme={theme}
                            createGlobalStyle={true}
                            createChildGlobals={false}
                            translate={translate}
                        >
                            <SessionLoader location={convertToLocation(request.url)}>
                                <SpireRouter />
                            </SessionLoader>
                        </ThemeProvider>
                    </ShellContext.Provider>
                </Provider>
            );

            rawHtml = renderToString(sheet.collectStyles(rawStorefront));
        };

        renderRawAndStyles();

        const trackedPromises = getTrackedPromises() ?? [];
        let promiseLoops = 0; // After a certain number of loops, there may be a problem.
        let redirect = getRedirectTo();
        while (trackedPromises.length !== 0 && promiseLoops < 10 && !redirect) {
            promiseLoops += 1;
            if (promiseLoops > 5) {
                // Suspicious
                if (promiseLoops === 6) {
                    logger.warn(
                        "New promises are still being created after 5 cycles, possible state management issue.",
                    );
                    setPromiseAddedCallback(stack =>
                        logger.warn(`${request.url}: New promise added on loop ${promiseLoops}: ${stack}`),
                    );
                }
                logger.warn(`${request.url}: tracked promises: ${trackedPromises.length}; loop ${promiseLoops}.`);
            }

            const awaitedPromises: typeof trackedPromises = [];
            let awaitedPromise: Promise<any> | undefined;
            // eslint-disable-next-line no-cond-assign
            while ((awaitedPromise = trackedPromises.shift())) {
                awaitedPromises.push(awaitedPromise);
            }

            await Promise.all(awaitedPromises);

            // Render again, potentially make more promises.
            renderRawAndStyles();
            redirect = getRedirectTo();
        }

        const statusCode = getStatusCode();
        if (statusCode) {
            response.status(statusCode);
        }

        if (redirect) {
            response.redirect(redirect);
            return;
        }

        // If there's a redirection, just send this information back to the host application
        if (routerContext.url) {
            response.setHeader("Content-Type", "application/json");
            response.redirect(routerContext.url);
            return;
        }
    }

    let shellFont: JSX.Element | undefined;
    if (isShellRequest) {
        // Roboto Condensed is used by the CMS
        // Open Sans is used by the default Mobius theme and may be seen in the Style Guide.
        shellFont = (
            <link href="https://fonts.googleapis.com/css?family=Barlow:300,400,700&display=swap" rel="stylesheet" />
        );
    }

    const storefrontFont = <link href={theme.typography.fontFamilyImportUrl} rel="stylesheet" />;

    const metadata = getPageMetadata();
    const state = store.getState() as ApplicationState;
    const noscriptTrackingScript = getNoscriptTrackingScript(state.context?.settings);
    const headTrackingScript = getHeadTrackingScript(state.context?.settings, state.context?.session);
    const favicon = state.context?.website.websiteFavicon;

    const app = (rawHtml: string) => (
        <html lang={languageCode}>
            <head>
                {/* eslint-disable react/no-danger */}
                {headTrackingScript && <script dangerouslySetInnerHTML={{ __html: headTrackingScript }}></script>}
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"></meta>
                <title>{isShellRequest ? "Content Administration" : metadata?.title}</title>
                {favicon && <link rel="icon" href={favicon} type="image/x-icon" />}
                <meta property="og:type" content="website" />
                <meta id="ogTitle" property="og:title" content={metadata?.openGraphTitle} />
                <meta id="ogImage" property="og:image" content={metadata?.openGraphImage} />
                <meta id="ogUrl" property="og:url" content={metadata?.openGraphUrl} />
                <meta name="keywords" content={metadata?.metaKeywords} />
                <meta name="description" content={metadata?.metaDescription} />
                <link rel="canonical" href={metadata?.canonicalUrl} />
                <base href="/" />
                {shellFont}
                {storefrontFont}
                {sheet?.getStyleElement()}
                <script>{`if (window.parent !== window) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.parent.__REACT_DEVTOOLS_GLOBAL_HOOK__;
}`}</script>
            </head>
            <body>
                {noscriptTrackingScript && (
                    <noscript dangerouslySetInnerHTML={{ __html: noscriptTrackingScript }}></noscript>
                )}
                {/* eslint-disable react/no-danger */}
                <div id="react-app" dangerouslySetInnerHTML={{ __html: rawHtml }}></div>
                {!isShellRequest && (
                    <script
                        dangerouslySetInnerHTML={{
                            __html: `
                var siteMessages = ${JSON.stringify(siteMessages)};
                var translationDictionaries = ${JSON.stringify(translationDictionaries)};`,
                        }}
                    ></script>
                )}
                {renderStorefrontServerSide && (
                    <script
                        dangerouslySetInnerHTML={{
                            __html: `var initialReduxState = ${JSON.stringify(state).replace(
                                new RegExp("</", "g"),
                                "<\\/",
                            )}`,
                        }}
                    ></script>
                )}
                <script dangerouslySetInnerHTML={{ __html: `var initialTheme = ${JSON.stringify(theme)}` }}></script>
                {/* eslint-enable react/no-danger */}
                <script async defer src={`/dist/${isShellRequest ? "shell" : "public"}.js?v=${BUILD_DATE}`} />
                <script src="https://test-htp.tokenex.com/Iframe/Iframe-v3.min.js"></script>
                {isShellRequest && (
                    <script src="/SystemResources/Scripts/Libraries/ckfinder/3.4.1/ckfinder.js"></script>
                )}
            </body>
        </html>
    );

    const renderedApp = `<!DOCTYPE html>${renderToStaticMarkup(app(rawHtml))}`;

    response.send(renderedApp);
}

let pageByUrlResult: RetrievePageResult;

async function loadPageAndSetInitialCookies(request: Request, response: Response) {
    let pageByUrlResponse;
    try {
        const bypassFilters = request.url.startsWith("/Content/Page/");
        const endpoint = `/api/v2/content/pageByUrl?url=${encodeURIComponent(request.url)}${
            bypassFilters ? "&bypassfilters=true" : ""
        }`;
        pageByUrlResponse = await rawRequest(endpoint, "GET", {}, undefined);
    } catch (ex) {
        // if this fails just log and continue, the regular way to retrieve the page will deal with sending the user to the unhandled error page.
        logger.error(ex);
    }

    if (pageByUrlResponse) {
        pageByUrlResult = await pageByUrlResponse.json();
        setInitialPage(pageByUrlResult, request.url);

        const existingCookies = request.cookies as SafeDictionary<string>;
        Object.keys(existingCookies).forEach((cookieName: string | number) => {
            existingCookies[cookieName] = encodeCookie(existingCookies[cookieName]!);
        });

        // getAll does exist and is needed to get more than a single set-cookie value
        const responseCookies = setCookie.parse((pageByUrlResponse.headers as any).getAll("set-cookie"));
        for (const cookie of responseCookies) {
            const options = {
                path: cookie.path,
                expires: cookie.expires,
                encode: encodeCookie,
            };

            response.cookie(cookie.name, cookie.value, options);
            existingCookies[cookie.name] = cookie.value;
        }

        setSessionCookies(existingCookies);

        return responseCookies;
    }
}
