
import { getTextInputColor } from "./forms";

test("getTextInputColor returns colors", () => {
    expect(getTextInputColor({ok: true})).toStrictEqual("success");
    expect(getTextInputColor({ok: false})).toStrictEqual("failure");
});

test("getTextInputColor returns undefined on null", () => {
    expect(getTextInputColor({ok: null})).toBeUndefined;
});

test("getTextInputColor override color-values", () => {
    expect(getTextInputColor({ok: true, success_color: undefined})).toBeUndefined;
    expect(getTextInputColor({ok: false, success_color: undefined})).toStrictEqual("failure");
    expect(getTextInputColor({ok: true, success_color: undefined})).toStrictEqual("success");
    expect(getTextInputColor({ok: false, failure_color: undefined})).toBeUndefined;
    expect(getTextInputColor({ok: true, success_color: "another-color"})).toStrictEqual("another-color");
});
