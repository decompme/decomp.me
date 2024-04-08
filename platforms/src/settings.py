import os

import tornado.options


def truthy(x):
    return x.lower() in ["true", "1", "yes", "on"]


def define(name, default=None, type=str):
    """Allows defaulting of command-line arguments from environment variables"""
    setting = os.environ.get(name.upper())
    if setting is None:
        setting = default
    else:
        setting = truthy(setting) if type is bool else type(setting)

    tornado.options.define(name, setting, type)
    # return value to help unittests
    return (name, setting, type)
