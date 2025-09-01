#!/usr/bin/env python3

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="ssh-manager",
    version="0.2.0",
    author="Jeremy",
    description="A cross-platform GUI application for managing SSH configurations through organized folders and visual forms",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/isriam/ssh_manager",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: System Administrators",
        "Topic :: System :: Networking",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=[
        "paramiko>=3.0.0",
        "sshtunnel>=0.4.0",
    ],
    entry_points={
        "console_scripts": [
            "ssh-manager=ssh_manager.main:main",
        ],
        "gui_scripts": [
            "ssh-manager-gui=ssh_manager.gui.main:main",
        ],
    },
    include_package_data=True,
    package_data={
        "ssh_manager": ["templates/*.conf", "assets/icons/*"],
    },
)